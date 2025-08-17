"use client";

import * as React from "react";
import { cn } from "../lib/utils";
import { StatusBadge } from "./StatusBadge";

export interface Task {
  id: string;
  title: string;
  type: "FOLLOW_UP" | "REFILL_PREP" | "REFILL_ARV" | "LABS_PENDING" | "VL_MONITOR" | "STI_SCREENING" | "LTFU_REVIEW" | "ADMIN";
  status: "OPEN" | "DONE" | "DISMISSED";
  dueDate?: Date;
  clientName?: string;
  clientCode?: string;
}

export interface TaskListProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onStatusChange?: (taskId: string, status: Task["status"]) => void;
  className?: string;
}

const TaskList = React.forwardRef<HTMLDivElement, TaskListProps>(
  ({ tasks, onTaskClick, onStatusChange, className, ...props }, ref) => {
    const getTaskTypeColor = (type: Task["type"]) => {
      switch (type) {
        case "FOLLOW_UP":
          return "bg-blue-100 text-blue-800";
        case "REFILL_PREP":
        case "REFILL_ARV":
          return "bg-green-100 text-green-800";
        case "LABS_PENDING":
          return "bg-yellow-100 text-yellow-800";
        case "VL_MONITOR":
          return "bg-purple-100 text-purple-800";
        case "STI_SCREENING":
          return "bg-pink-100 text-pink-800";
        case "LTFU_REVIEW":
          return "bg-red-100 text-red-800";
        case "ADMIN":
          return "bg-gray-100 text-gray-800";
        default:
          return "bg-gray-100 text-gray-800";
      }
    };

    const formatDueDate = (date?: Date) => {
      if (!date) return null;
      const now = new Date();
      const diffMs = date.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`;
      if (diffDays === 0) return "Due today";
      if (diffDays === 1) return "Due tomorrow";
      return `Due in ${diffDays} days`;
    };

    return (
      <div
        ref={ref}
        className={cn("space-y-2", className)}
        {...props}
      >
        {tasks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No tasks found
          </div>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className={cn(
                "rounded-lg border bg-card p-4 hover:bg-accent/50 transition-colors cursor-pointer",
                task.status === "DONE" && "opacity-60"
              )}
              onClick={() => onTaskClick?.(task)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                        getTaskTypeColor(task.type)
                      )}
                    >
                      {task.type.replace("_", " ")}
                    </span>
                    <StatusBadge status={task.status} />
                  </div>
                  <h4 className="font-medium text-sm">{task.title}</h4>
                  {(task.clientName || task.clientCode) && (
                    <p className="text-xs text-muted-foreground">
                      {task.clientName} {task.clientCode && `(${task.clientCode})`}
                    </p>
                  )}
                  {task.dueDate && (
                    <p className={cn(
                      "text-xs",
                      task.dueDate < new Date() ? "text-red-600" : "text-muted-foreground"
                    )}>
                      {formatDueDate(task.dueDate)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    );
  }
);
TaskList.displayName = "TaskList";

export { TaskList };