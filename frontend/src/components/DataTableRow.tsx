import React, { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DataTableRowProps {
  summary: React.ReactNode;
  details: React.ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
  customActions?: React.ReactNode;
}

export function DataTableRow({ summary, details, onEdit, onDelete, customActions }: DataTableRowProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr 
        onClick={() => setExpanded(e => !e)} 
        className="cursor-pointer hover:bg-muted/50 border-b border-border transition-colors"
      >
        {summary}
        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-end gap-2">
            {customActions}
            {onEdit && (
              <button 
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                className="p-1.5 text-muted-foreground hover:text-indigo-500 hover:bg-indigo-500/10 rounded-lg transition-colors"
                title="Edit"
              >
                <Pencil className="size-4" />
              </button>
            )}
            {onDelete && (
              <button 
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                title="Delete"
              >
                <Trash2 className="size-4" />
              </button>
            )}
          </div>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={99} className="bg-muted/40 px-6 py-4 border-b border-border shadow-inner">
            {details}
          </td>
        </tr>
      )}
    </>
  );
}
