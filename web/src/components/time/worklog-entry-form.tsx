import * as React from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FormField } from "@/components/shared/form-field"
import { DateTimePicker } from "@/components/ui/date-time-picker"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import type { ProjectResponse } from "@/api/generated/types.gen"

const worklogEntrySchema = z.object({
  date: z.date({
    required_error: "A date of work is required.",
  }),
  projectId: z.string().min(1, "Project is required"),
  activityType: z.string().min(1, "Activity type is required"),
  hours: z.coerce.number().positive().max(24, "Maximum 24 hours per entry"),
  description: z.string().min(10, "Description must be at least 10 characters"),
})

type WorklogEntryValues = z.infer<typeof worklogEntrySchema>

interface WorklogEntryFormProps {
  onSubmit: (values: WorklogEntryValues) => void
  onCancel?: () => void
  isLoading?: boolean
}

export function WorklogEntryForm({
  onSubmit,
  onCancel,
  isLoading,
}: WorklogEntryFormProps) {
  const [projects, setProjects] = React.useState<ProjectResponse[]>([])
  const [loadingProjects, setLoadingProjects] = React.useState(true)

  React.useEffect(() => {
    fetch("/api/v1/projects")
      .then((res) => res.json())
      .then((data) => {
        setProjects(data)
        setLoadingProjects(false)
      })
      .catch(() => setLoadingProjects(false))
  }, [])

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<WorklogEntryValues>({
    resolver: zodResolver(worklogEntrySchema),
    defaultValues: {
      date: new Date(),
      activityType: "DEVELOPMENT",
      hours: 1,
      description: "",
    },
  })

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Log Time</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="grid gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Controller
              control={control}
              name="date"
              render={({ field }) => (
                <FormField label="Date" error={errors.date?.message} required>
                  <DateTimePicker date={field.value} setDate={field.onChange} />
                </FormField>
              )}
            />
            <Controller
              control={control}
              name="projectId"
              render={({ field }) => (
                <FormField label="Project" error={errors.projectId?.message} required>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger disabled={loadingProjects}>
                      <SelectValue placeholder={loadingProjects ? "Loading projects..." : "Select project"} />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id.toString()}>
                          {project.name} ({project.key})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Controller
              control={control}
              name="activityType"
              render={({ field }) => (
                <FormField label="Activity Type" error={errors.activityType?.message} required>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select activity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DEVELOPMENT">Development</SelectItem>
                      <SelectItem value="MEETING">Meeting</SelectItem>
                      <SelectItem value="REVIEW">Code Review</SelectItem>
                      <SelectItem value="RESEARCH">Research</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
              )}
            />
            <FormField label="Hours" error={errors.hours?.message} required>
              <Input
                type="number"
                step="0.25"
                min="0.25"
                max="24"
                {...register("hours")}
              />
            </FormField>
          </div>

          <FormField label="Description" error={errors.description?.message} required>
            <Textarea
              placeholder="What did you work on? (Minimum 10 characters)"
              className="min-h-[100px]"
              {...register("description")}
            />
          </FormField>
        </CardContent>
        <CardFooter className="flex justify-end gap-3">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isLoading || loadingProjects}>
            {isLoading ? "Saving..." : "Log Work"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
