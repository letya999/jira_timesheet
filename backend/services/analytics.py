import pandas as pd
from typing import List, Dict
from io import BytesIO

def generate_pivot_table_data(data: List[Dict]) -> pd.DataFrame:
    """
    Takes flat list of dictionaries with logs (jira + manual) and user context,
    and creates a DataFrame for aggregation.
    """
    df = pd.DataFrame(data)
    if df.empty:
        return df
    
    # Fill NA for categories
    if 'category' not in df.columns:
        df['category'] = 'Jira Work'
    else:
        df['category'] = df['category'].fillna('Jira Work')
        
    # Grouping for CEO: Department -> Division -> OrgUnit -> Employee -> Project/Release
    return df

def generate_excel_report(df: pd.DataFrame) -> BytesIO:
    """
    Generates Excel bytes from DataFrame using openpyxl.
    """
    output = BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Timesheet Report')
        
        # Example of formatting
        worksheet = writer.sheets['Timesheet Report']
        for col in worksheet.columns:
            max_length = 0
            column = col[0].column_letter
            for cell in col:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(cell.value)
                except:
                    pass
            adjusted_width = (max_length + 2)
            worksheet.column_dimensions[column].width = adjusted_width

    output.seek(0)
    return output