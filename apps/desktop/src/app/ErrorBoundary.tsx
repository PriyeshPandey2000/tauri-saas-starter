import { Component, type ErrorInfo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/shared/ui/button";

type ErrorFallbackProps = {
  error: Error;
  reset?: () => void;
};

export function ErrorFallback({ error, reset }: ErrorFallbackProps) {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-semibold">{t("error.title")}</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        {t("error.description")}
      </p>
      <pre className="max-w-lg overflow-x-auto rounded-md bg-muted px-3 py-2 text-left text-xs text-muted-foreground">
        {error.message}
      </pre>
      <div className="flex gap-2">
        {reset ? (
          <Button variant="outline" onClick={reset}>
            {t("error.reload")}
          </Button>
        ) : null}
        <Button onClick={() => window.location.reload()}>
          {t("error.reload")}
        </Button>
      </div>
    </div>
  );
}

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  error: Error | null;
};

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Uncaught error in component tree", error, info);
  }

  render(): ReactNode {
    const { error } = this.state;
    if (error) {
      return (
        <ErrorFallback
          error={error}
          reset={() => this.setState({ error: null })}
        />
      );
    }
    return this.props.children;
  }
}
