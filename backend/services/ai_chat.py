import asyncio
import logging
import re
from typing import AsyncGenerator, List, Dict, Any, Optional
import pandas as pd
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from vanna.legacy.openai import OpenAI_Chat
from vanna.legacy.chromadb import ChromaDB_VectorStore

from core.config import settings
from schemas.ai import ChatChunk, TrainResponse

logger = logging.getLogger(__name__)

class MyVanna(ChromaDB_VectorStore, OpenAI_Chat):
    def __init__(self, config=None):
        ChromaDB_VectorStore.__init__(self, config=config)
        OpenAI_Chat.__init__(self, config=config)

_vanna_instance: Optional[MyVanna] = None
_vanna_lock = asyncio.Lock()

async def get_vanna() -> MyVanna:
    global _vanna_instance
    async with _vanna_lock:
        if _vanna_instance is None:
            # Initialize Vanna
            config = {
                "api_key": settings.OPENAI_API_KEY,
                "model": settings.AI_MODEL,
                "path": settings.VANNA_STORAGE_PATH,
            }
            _vanna_instance = MyVanna(config=config)
        return _vanna_instance

def is_select_only(sql: str) -> bool:
    # Basic check to ensure only SELECT statements are allowed
    # Remove comments
    sql_clean = re.sub(r'--.*?\n', '', sql, flags=re.MULTILINE)
    sql_clean = re.sub(r'/\*.*?\*/', '', sql_clean, flags=re.DOTALL)
    sql_clean = sql_clean.strip().lower()
    
    # Check if it starts with select
    if not sql_clean.startswith("select"):
        return False
    
    # Check for forbidden keywords that might be hidden
    forbidden = ["insert", "update", "delete", "drop", "truncate", "alter", "create", "grant", "revoke"]
    for word in forbidden:
        if re.search(rf"\b{word}\b", sql_clean):
            return False
            
    return True

async def run_sql_safe(db: AsyncSession, sql: str) -> List[Dict[str, Any]]:
    if not is_select_only(sql):
        raise ValueError("Only SELECT statements are allowed")

    # Set statement timeout for this session
    await db.execute(text(f"SET statement_timeout = '{settings.AI_QUERY_TIMEOUT_SECONDS}s'"))
    
    result = await db.execute(text(sql))
    rows = result.mappings().all()
    
    # Convert to list of dicts, limit rows
    data = [dict(row) for row in rows[:settings.AI_MAX_RESULT_ROWS]]
    return data

async def generate_and_run(message: str, db: AsyncSession) -> AsyncGenerator[ChatChunk, None]:
    vn = await get_vanna()
    
    try:
        # Stage 1: Generating SQL
        yield ChatChunk(stage="generating_sql")
        
        # Generate SQL (this is a sync call, run in thread)
        loop = asyncio.get_event_loop()
        sql = await loop.run_in_executor(None, vn.generate_sql, message)
        
        if not sql:
            yield ChatChunk(stage="error", error="COULD_NOT_GENERATE_SQL")
            return

        # Stage 2: SQL generated
        yield ChatChunk(stage="sql", sql=sql)
        
        # Stage 3: Running query
        yield ChatChunk(stage="running_query")
        
        try:
            data = await run_sql_safe(db, sql)
            
            # Stage 4: Data returned
            yield ChatChunk(stage="data", data=data)
            
            # Stage 5: Summarize / Complete
            # Convert data to string for summarization if not too large
            df = pd.DataFrame(data)
            summary_prompt = f"Question: {message}\nSQL: {sql}\nData: {df.to_string(index=False)}"
            # Vanna's generate_explanation or similar
            answer = await loop.run_in_executor(None, vn.generate_explanation, message, sql, df)
            
            yield ChatChunk(stage="complete", answer=answer)
            
        except asyncio.TimeoutError:
            yield ChatChunk(stage="error", error="QUERY_TIMEOUT")
        except ValueError as e:
            yield ChatChunk(stage="error", error="INSECURE_SQL")
        except Exception as e:
            logger.error(f"Error running SQL: {e}", exc_info=True)
            yield ChatChunk(stage="error", error="DATABASE_ERROR")

    except Exception as e:
        logger.error(f"Error in generate_and_run: {e}", exc_info=True)
        yield ChatChunk(stage="error", error="AI_SERVICE_ERROR")

async def train_schema(db: AsyncSession) -> TrainResponse:
    vn = await get_vanna()
    
    try:
        # Introspect schema
        query = """
        SELECT table_name, column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name NOT IN ('alembic_version')
        ORDER BY table_name, ordinal_position;
        """
        result = await db.execute(text(query))
        columns = result.all()
        
        tables = {}
        for row in columns:
            table_name, column_name, data_type = row
            if table_name not in tables:
                tables[table_name] = []
            tables[table_name].append(f"{column_name} {data_type}")
            
        loop = asyncio.get_event_loop()
        trained_count = 0
        
        for table_name, cols in tables.items():
            ddl = f"CREATE TABLE {table_name} (\n  " + ",\n  ".join(cols) + "\n);"
            # vn.train is sync
            await loop.run_in_executor(None, vn.train, None, None, ddl)
            trained_count += 1
            
        return TrainResponse(
            success=True,
            tables_trained=trained_count,
            message=f"Successfully trained {trained_count} tables"
        )
    except Exception as e:
        logger.error(f"Error training schema: {e}", exc_info=True)
        return TrainResponse(
            success=False,
            tables_trained=0,
            message="Training failed"
        )

def vanna_is_ready() -> bool:
    return settings.AI_ENABLED and settings.OPENAI_API_KEY is not None
