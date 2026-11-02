import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <Card className="gap-6 rounded-2xl border border-border py-6 shadow-2xl shadow-black/40 ring-0">
      <CardHeader className="px-6">
        <CardTitle className="text-xl font-semibold">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="px-6">{children}</CardContent>
      {footer ? <div className="px-6 text-center text-sm text-muted-foreground">{footer}</div> : null}
    </Card>
  );
}
