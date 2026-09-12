import type { Trip } from "@/types";
export interface TravelAI {
  reply: (message: string, trip?: Trip) => Promise<string>;
}
export const travelAI: TravelAI = {
  async reply(message, trip) {
    await new Promise((resolve) => setTimeout(resolve, 700));
    const city = trip?.destination ?? "Roma";
    const text = message.toLowerCase();
    if (/chov|chuva|reorganiz|atras|tarde/.test(text))
      return `Para seu dia em ${city}, sugiro deixar a manhã mais leve e priorizar uma atividade coberta à tarde. Reserve 30 minutos entre os compromissos. Você pode editar os horários na aba Roteiro. Esta é uma sugestão demonstrativa; nada foi alterado automaticamente.`;
    if (/gast|barat|orçamento/.test(text))
      return `Para economizar em ${city}, combine passeios gratuitos com uma refeição em um mercado local. Seu orçamento cadastrado é de ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(trip?.budget ?? 8000)}. Revise a aba Gastos antes de reservar. Valores e recomendações desta conversa são simulados.`;
    if (/comer|restaurante|gastronom/.test(text))
      return `Uma pausa gastronômica pode encaixar bem entre duas atividades em ${city}. No roteiro de exemplo de Roma, o bairro Monti fica perto do Coliseu. Confirme horário, preço e distância antes de sair; não tenho acesso a locais em tempo real.`;
    if (/hora|livre/.test(text))
      return `Com duas horas livres em ${city}, escolha uma caminhada curta, uma pausa para café e tempo para voltar com calma. Consulte os locais do seu roteiro no mapa ilustrativo e confirme a rota em um aplicativo de navegação.`;
    return `Vamos pensar na sua viagem${trip ? ` ${trip.name}` : ""}! Sugestão: comece com história pela manhã, reserve tempo para um almoço sem pressa e termine com um passeio ao ar livre. Posso sugerir alternativas para chuva, economia ou tempo livre. Sou a demonstração da Voyra AI, sem conexão com serviços externos.`;
  },
};
