import { notFound } from "next/navigation";
import { AccountPage } from "@/components/account";
export default async function Page({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (
    !["explorar", "favoritos", "roteiros", "documentos", "perfil", "configuracoes"].includes(
      section,
    )
  )
    notFound();
  return <AccountPage key={section} section={section} />;
}
