import { useParams } from "react-router-dom";
import { usePublicForm, useSubmitPublicForm } from "@/hooks/usePublicForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

type Field = { name: string; label: string; type?: string; required?: boolean; hidden?: boolean; defaultValue?: string; options?: string };

export default function FormPublic() {
  const { slug } = useParams();
  const formQuery = usePublicForm(slug || "");
  const submit = useSubmitPublicForm(slug || "");
  const { toast } = useToast();
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const form = formQuery.data;
  const fields: Field[] = (form?.fields as any) ?? [];

  // initialize hidden defaults
  useEffect(() => {
    const hiddenDefaults: Record<string, string> = {};
    fields.forEach((f) => {
      if (f.hidden && f.defaultValue !== undefined) hiddenDefaults[f.name] = String(f.defaultValue);
    });
    if (Object.keys(hiddenDefaults).length) {
      setAnswers((prev) => ({ ...hiddenDefaults, ...prev }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  const onSubmit = async () => {
    try {
      await submit.mutateAsync(answers);
      toast({ title: "Submitted", description: "Thank you for your report." });
      setAnswers({});
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
  };

  if (formQuery.isLoading) return <div className="p-6 text-center">Loading form…</div>;
  if (formQuery.isError || !form) return <div className="p-6 text-center">Form not found.</div>;

  return (
    <div className="min-h-screen bg-muted/20 flex items-start justify-center py-10 px-4">
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader>
          <CardTitle>{form.title}</CardTitle>
          {form.description && <p className="text-sm text-muted-foreground">{form.description}</p>}
          {form.headerImage && (
            <img src={form.headerImage} alt="Form header" className="mt-3 rounded-md border" />
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {form.sections && Array.isArray(form.sections) && form.sections.length > 0 && (
            <div className="space-y-6">
              {(form.sections as string[]).map((section, idx) => (
                <div key={idx} className="space-y-3">
                  <p className="text-sm font-semibold">{section}</p>
                  {fields
                    .filter((f) => !f.hidden && (f.section === section || !f.section))
                    .map((f) => {
                      const options = Array.isArray(f.options)
                        ? f.options
                        : (f.options ?? "")
                            .split(",")
                            .map((o) => o.trim())
                            .filter(Boolean);
                      const displayLabel =
                        (f.label || f.name || "")
                          .replace(/_/g, " ")
                          .replace(/\s+/g, " ")
                          .replace(/\b\w/g, (c) => c.toUpperCase()) || "Question";
                      return (
                        <div key={f.name} className="space-y-1">
                          <label className="text-sm font-medium">
                            {displayLabel} {f.required ? "*" : ""}
                          </label>
                          {f.type === "textarea" ? (
                            <Textarea
                              value={answers[f.name] ?? ""}
                              onChange={(e) => setAnswers((prev) => ({ ...prev, [f.name]: e.target.value }))}
                            />
                          ) : f.type === "radio" ? (
                            <div className="space-y-2">
                              {options.map((opt) => (
                                <label key={opt} className="flex items-center gap-2 text-sm">
                                  <input
                                    type="radio"
                                    name={f.name}
                                    value={opt}
                                    checked={answers[f.name] === opt}
                                    onChange={(e) => setAnswers((prev) => ({ ...prev, [f.name]: e.target.value }))}
                                  />
                                  {opt}
                                </label>
                              ))}
                            </div>
                          ) : f.type === "checkbox" ? (
                            <div className="space-y-2">
                              {options.map((opt) => {
                                const current = answers[f.name]?.split(",").filter(Boolean) ?? [];
                                const checked = current.includes(opt);
                                return (
                                  <label key={opt} className="flex items-center gap-2 text-sm">
                                    <input
                                      type="checkbox"
                                      value={opt}
                                      checked={checked}
                                      onChange={() => {
                                        const next = checked
                                          ? current.filter((c) => c !== opt)
                                          : [...current, opt];
                                        setAnswers((prev) => ({ ...prev, [f.name]: next.join(",") }));
                                      }}
                                    />
                                    {opt}
                                  </label>
                                );
                              })}
                            </div>
                          ) : (
                            <Input
                              type={f.type === "number" ? "number" : "text"}
                              value={answers[f.name] ?? ""}
                              onChange={(e) => setAnswers((prev) => ({ ...prev, [f.name]: e.target.value }))}
                              required={f.required}
                            />
                          )}
                        </div>
                      );
                    })}
                </div>
              ))}
            </div>
          )}

          {fields
            .filter((f) => !f.hidden)
            .filter((f) => !(form.sections && Array.isArray(form.sections) && form.sections.length > 0 && f.section))
            .map((f) => {
            const options = Array.isArray(f.options)
              ? f.options
              : (f.options ?? "")
                  .split(",")
                  .map((o) => o.trim())
                  .filter(Boolean);
            const displayLabel =
              (f.label || f.name || "")
                .replace(/_/g, " ")
                .replace(/\s+/g, " ")
                .replace(/\b\w/g, (c) => c.toUpperCase()) || "Question";
            return (
              <div key={f.name} className="space-y-1">
                <label className="text-sm font-medium">
                  {displayLabel} {f.required ? "*" : ""}
                </label>
                {f.type === "textarea" ? (
                  <Textarea
                    value={answers[f.name] ?? ""}
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [f.name]: e.target.value }))}
                  />
                ) : f.type === "radio" ? (
                  <div className="space-y-2">
                    {options.map((opt) => (
                      <label key={opt} className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name={f.name}
                          value={opt}
                          checked={answers[f.name] === opt}
                          onChange={(e) => setAnswers((prev) => ({ ...prev, [f.name]: e.target.value }))}
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                ) : f.type === "checkbox" ? (
                  <div className="space-y-2">
                    {options.map((opt) => {
                      const current = (answers[f.name]?.split(",").filter(Boolean)) ?? [];
                      const checked = current.includes(opt);
                      return (
                        <label key={opt} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            value={opt}
                            checked={checked}
                            onChange={(e) => {
                              const next = checked
                                ? current.filter((c) => c !== opt)
                                : [...current, opt];
                              setAnswers((prev) => ({ ...prev, [f.name]: next.join(",") }));
                            }}
                          />
                          {opt}
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <Input
                    type={f.type === "number" ? "number" : "text"}
                    value={answers[f.name] ?? ""}
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [f.name]: e.target.value }))}
                    required={f.required}
                  />
                )}
              </div>
            );
          })}
          <Button className="w-full" onClick={onSubmit} disabled={submit.isPending}>
            {submit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            <span className="ml-2">Submit</span>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
