'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Send, Upload, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@kit/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@kit/ui/form';
import { Textarea } from '@kit/ui/textarea';

const ChatInputSchema = z.object({
  message: z.string().optional(),
});

type ChatInputFormData = z.infer<typeof ChatInputSchema>;

interface ChatInputFormProps {
  onSubmit: (message: string, file?: File) => Promise<void>;
  isLoading: boolean;
}

export function ChatInputForm({ onSubmit, isLoading }: ChatInputFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ChatInputFormData>({
    resolver: zodResolver(ChatInputSchema),
    defaultValues: {
      message: '',
    },
  });

  const messageValue = useWatch({ control: form.control, name: 'message' });

  const handleSubmit = async (data: ChatInputFormData) => {
    const message = data.message || (selectedFile ? `Upload Excel file: ${selectedFile.name}` : '');

    if (!message && !selectedFile) {
      return;
    }

    await onSubmit(message, selectedFile || undefined);
    form.reset();
    setSelectedFile(null);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      form.handleSubmit(handleSubmit)();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (file) {
      // Check file type
      const validTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv',
      ];

      if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx?|csv)$/i)) {
        alert('Please select a valid Excel or CSV file (.xlsx, .xls, .csv)');
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-2 p-4"
      >
        {selectedFile && (
          <div className="flex items-center gap-2 rounded-md border bg-muted p-2">
            <Upload className="h-4 w-4 text-muted-foreground" />
            <span className="flex-1 truncate text-sm">{selectedFile.name}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleRemoveFile}
              className="h-6 w-6"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div className="flex gap-2">
          <FormField
            control={form.control}
            name="message"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder={
                      selectedFile
                        ? 'Optional: Add a message with your file upload...'
                        : "Type your message... (e.g., 'List all items') or upload an Excel/CSV file"
                    }
                    disabled={isLoading}
                    onKeyDown={handleKeyDown}
                    className="min-h-[60px] resize-none"
                    data-test="chat-input"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex flex-col gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
              disabled={isLoading}
            />

            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={handleUploadClick}
              disabled={isLoading}
              className="h-[60px] w-[60px]"
              title="Upload Excel/CSV file"
            >
              <Upload className="h-5 w-5" />
            </Button>

            <Button
              type="submit"
              size="icon"
              disabled={isLoading || (!messageValue && !selectedFile)}
              className="h-[60px] w-[60px]"
              data-test="chat-send-button"
              title="Send message"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
