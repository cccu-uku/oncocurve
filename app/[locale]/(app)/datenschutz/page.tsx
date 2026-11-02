"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { useTranslations } from "next-intl";
import React from "react";

export default function DatenschutzPage() {
  const t = useTranslations("Datenschutz");

  const section = (titleKey: string, bodyKey: string) => (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold text-foreground">{t(titleKey)}</h2>
      <p className="text-muted-foreground">{t(bodyKey)}</p>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8 text-sm leading-6 text-justify">
          <section className="space-y-2">
            <p className="text-muted-foreground">{t("intro")}</p>
          </section>

          <div className="h-px bg-border" />

          <section className="space-y-6">
            {section("localTitle", "localBody")}
            {section("noTransferTitle", "noTransferBody")}
            {section("storageTitle", "storageBody")}
            {section("trackingTitle", "trackingBody")}
            {section("hostingTitle", "hostingBody")}
          </section>

          <div className="h-px bg-border" />

          <section className="space-y-6">
            {section("responsibleTitle", "responsibleBody")}
            {section("rightsTitle", "rightsBody")}
          </section>

          <div className="h-px bg-border" />

          <section className="space-y-6">
            {section("purposeTitle", "purposeBody")}
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
