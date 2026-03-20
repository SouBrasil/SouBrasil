import { useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import {
  Toast,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";

function AutoDismissToast({ id, title, description, action, dismiss, ...props }) {
  useEffect(() => {
    const timer = setTimeout(() => dismiss(id), 3000);
    return () => clearTimeout(timer);
  }, [id, dismiss]);

  return (
    <Toast key={id} {...props} className="bg-green-100 border-green-300 shadow-xl text-green-900">
      <div className="grid gap-1">
        {title && <ToastTitle>{title}</ToastTitle>}
        {description && <ToastDescription>{description}</ToastDescription>}
      </div>
      {action}
    </Toast>
  );
}

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, action, ...props }) => (
        <AutoDismissToast
          key={id}
          id={id}
          title={title}
          description={description}
          action={action}
          dismiss={dismiss}
          {...props}
        />
      ))}
      <ToastViewport />
    </ToastProvider>
  );
}