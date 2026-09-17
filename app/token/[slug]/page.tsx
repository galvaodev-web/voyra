import { notFound } from "next/navigation";
import { Award, MapPin } from "lucide-react";
import Link from "next/link";
import { adminClient } from "@/lib/supabase/admin";

export default async function TokenPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!/^[a-f0-9]{32}$/.test(slug)) notFound();
  const result = await adminClient()
    .from("travel_tokens")
    .select("public_id,token_type,destination,country_name,cities,travel_year,days,verified_place_count,serial_number,achievement_code,rarity,verification,public_recap_id,issued_at")
    .eq("share_slug", slug)
    .eq("status", "ACTIVE")
    .eq("visible", true)
    .maybeSingle();
  if (result.error || !result.data) notFound();
  const token = result.data;
  const label = token.destination || token.country_name || token.achievement_code?.replaceAll("_", " ") || "Jornada";
  return (
    <main className="auth-page">
      <section className="auth-card" style={{ textAlign: "center" }}>
        <span className="eyebrow">TRAVEL TOKEN · {token.rarity}</span>
        <Award size={72} style={{ margin: "28px auto" }} />
        <h1>{label}</h1>
        {token.country_name && <p>{token.country_name} · {token.travel_year}</p>}
        <p><MapPin size={16} /> {token.days ?? 0} dias · {token.verified_place_count} lugares · Verified Trip</p>
        <strong>{token.serial_number}</strong>
        <small>ID público: {token.public_id}</small>
        {token.public_recap_id && process.env.NEXT_PUBLIC_SOCIAL_URL && (
          <Link className="button secondary" href={`${process.env.NEXT_PUBLIC_SOCIAL_URL}/recap/${token.public_recap_id}`}>
            Abrir Travel Recap
          </Link>
        )}
      </section>
    </main>
  );
}
