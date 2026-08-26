
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

export class GeminiService {
  /**
   * Generates a broad marketing campaign message.
   */
  static async generateCampaignMessage(shopName: string, goal: string): Promise<string> {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Você é um especialista em marketing de luxo para barbearias. A barbearia se chama ${shopName}. Crie uma mensagem de broadcast irresistível para o WhatsApp com o seguinte objetivo: ${goal}. Use emojis, seja direto e elegante. Não use campos dinâmicos além de [NOME DO CLIENTE].`,
      });
      return response.text || "Olá! Temos novidades especiais para você aqui na nossa barbearia.";
    } catch (error) {
      return "Olá! Temos novidades especiais para você aqui na nossa barbearia.";
    }
  }

  /**
   * Generates various business communication messages.
   */
  static async generateBusinessMessage(type: 'confirmation' | 'payment' | 'reminder', clientName: string, serviceName: string, time?: string, price?: number): Promise<string> {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      let prompt = "";
      
      if (type === 'confirmation') {
        prompt = `Escreva um lembrete de agendamento de barbearia para ${clientName}. Serviço: ${serviceName} às ${time}. Seja educado e use emojis.`;
      } else if (type === 'reminder') {
        prompt = `Escreva um lembrete rápido e simpático para o cliente ${clientName} avisando que o horário dele (${time}) para o serviço ${serviceName} está chegando. Use emojis.`;
      } else {
        prompt = `Escreva uma cobrança educada para ${clientName} sobre o pagamento pendente de R$ ${price} referente ao serviço ${serviceName}. Seja profissional e amigável.`;
      }
      
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      return response.text || "Olá! Gostaria de falar com você sobre seu agendamento.";
    } catch (error) {
      if (type === 'confirmation') return `Olá ${clientName}, confirmando seu horário de ${serviceName} às ${time}.`;
      if (type === 'reminder') return `Olá ${clientName}, passando para lembrar do seu horário hoje às ${time} para o serviço ${serviceName}. Até logo!`;
      return `Olá ${clientName}, consta um pagamento pendente de R$ ${price} do serviço ${serviceName}.`;
    }
  }

  /**
   * Provides business advice based on performance metrics.
   */
  static async getBusinessAdvice(dailyRevenue: number, monthlyRevenue: number, topService: string): Promise<string> {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Como consultor de negócios para barbearias, analise estes dados: Receita diária: R$ ${dailyRevenue}, Receita mensal: R$ ${monthlyRevenue}, Serviço mais vendido: ${topService}. Forneça 3 dicas curtas para aumentar o faturamento.`,
      });
      return response.text || "Foque na fidelização de clientes para garantir receita recorrente.";
    } catch (error) {
      return "Foque na fidelização de clientes para garantir receita recorrente.";
    }
  }
}
