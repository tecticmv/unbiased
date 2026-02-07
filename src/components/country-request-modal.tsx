import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Globe, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CountryRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCountryName?: string;
}

type RequestStatus = "idle" | "submitting" | "success" | "error";

export function CountryRequestModal({
  open,
  onOpenChange,
  initialCountryName = "",
}: CountryRequestModalProps) {
  const { t } = useTranslation();
  const [countryName, setCountryName] = useState(initialCountryName);
  const [requesterName, setRequesterName] = useState("");
  const [requesterEmail, setRequesterEmail] = useState("");
  const [status, setStatus] = useState<RequestStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [requestId, setRequestId] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!countryName.trim()) {
      setErrorMessage(t("countryRequest.errors.nameRequired", "Please enter a country name"));
      setStatus("error");
      return;
    }

    setStatus("submitting");
    setErrorMessage("");

    try {
      const response = await fetch("/api/country-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          countryName: countryName.trim(),
          requesterName: requesterName.trim() || undefined,
          requesterEmail: requesterEmail.trim() || undefined,
        }),
      });

      const data = await response.json() as { requestId?: number; error?: string; reason?: string };

      if (!response.ok) {
        // Show reason if available (e.g., "This is not a recognized sovereign country")
        const errorMsg = data.reason || data.error || "Failed to submit request";
        throw new Error(errorMsg);
      }

      setRequestId(data.requestId ?? null);
      setStatus("success");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "An unexpected error occurred"
      );
      setStatus("error");
    }
  };

  const handleClose = () => {
    // Reset form when closing
    if (status === "success") {
      setCountryName("");
      setRequesterName("");
      setRequesterEmail("");
      setStatus("idle");
      setRequestId(null);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader className="pr-6">
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 shrink-0" />
            <span>{t("countryRequest.title", "Request a New Country")}</span>
          </DialogTitle>
          <DialogDescription>
            {t(
              "countryRequest.description",
              "Can't find your country? Request it here and we'll add it to the platform."
            )}
          </DialogDescription>
        </DialogHeader>

        {status === "success" ? (
          <div className="flex flex-col items-center gap-4 py-4 sm:py-6">
            <CheckCircle className="h-10 w-10 sm:h-12 sm:w-12 text-green-500" />
            <div className="text-center px-2">
              <h3 className="font-semibold">
                {t("countryRequest.success.title", "Request Submitted!")}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {t(
                  "countryRequest.success.message",
                  "We'll review your request and notify you when it's ready."
                )}
              </p>
              {requestId && (
                <p className="text-xs text-muted-foreground mt-2">
                  {t("countryRequest.success.requestId", "Request ID")}: #{requestId}
                </p>
              )}
            </div>
            <Button onClick={handleClose} className="mt-2 w-full sm:w-auto">
              {t("common.close", "Close")}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-2 sm:py-4">
              <div className="grid gap-2">
                <Label htmlFor="countryName">
                  {t("countryRequest.countryName", "Country Name")} *
                </Label>
                <Input
                  id="countryName"
                  value={countryName}
                  onChange={(e) => setCountryName(e.target.value)}
                  placeholder={t("countryRequest.countryNamePlaceholder", "e.g., Japan, Brazil, Kenya")}
                  disabled={status === "submitting"}
                  autoComplete="off"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="requesterName">
                  {t("countryRequest.yourName", "Your Name")} ({t("common.optional", "optional")})
                </Label>
                <Input
                  id="requesterName"
                  value={requesterName}
                  onChange={(e) => setRequesterName(e.target.value)}
                  placeholder={t("countryRequest.yourNamePlaceholder", "Your name")}
                  disabled={status === "submitting"}
                  autoComplete="name"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="requesterEmail">
                  {t("countryRequest.yourEmail", "Your Email")} ({t("common.optional", "optional")})
                </Label>
                <Input
                  id="requesterEmail"
                  type="email"
                  value={requesterEmail}
                  onChange={(e) => setRequesterEmail(e.target.value)}
                  placeholder={t("countryRequest.yourEmailPlaceholder", "email@example.com")}
                  disabled={status === "submitting"}
                  autoComplete="email"
                />
                <p className="text-xs text-muted-foreground">
                  {t(
                    "countryRequest.emailNote",
                    "We'll notify you when your country is added"
                  )}
                </p>
              </div>

              {status === "error" && errorMessage && (
                <div className="flex items-start gap-2 text-sm text-destructive rounded-md bg-destructive/10 p-3">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={status === "submitting"}
                className="w-full sm:w-auto"
              >
                {t("common.cancel", "Cancel")}
              </Button>
              <Button type="submit" disabled={status === "submitting"} className="w-full sm:w-auto">
                {status === "submitting" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("countryRequest.submitting", "Submitting...")}
                  </>
                ) : (
                  t("countryRequest.submit", "Submit Request")
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
