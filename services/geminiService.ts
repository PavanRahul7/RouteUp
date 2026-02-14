
import { GoogleGenAI, Type } from "@google/genai";
import { Route, RunHistory, LatLng } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const geminiService = {
  async geocodeLocation(query: string): Promise<LatLng | null> {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Given the location query "${query}", return ONLY a JSON object with "lat" and "lng" properties for that location. If you don't know the exact location, provide coordinates for a major landmark or city center associated with it. Do not include any other text.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              lat: { type: Type.NUMBER },
              lng: { type: Type.NUMBER }
            },
            required: ["lat", "lng"]
          }
        }
      });
      const jsonStr = response.text.trim();
      return JSON.parse(jsonStr);
    } catch (e) {
      console.error('Geocoding error:', e);
      return null;
    }
  },

  async generateRouteDescription(name: string, distance: number, elevation: number, tags: string[]): Promise<string> {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Write a short, engaging 2-sentence description for a running route named "${name}". 
        It is ${distance}km long with ${elevation}m elevation gain. 
        Tags: ${tags.join(', ')}. Focus on the vibe and difficulty.`
      });
      return response.text || "A great path for your next run.";
    } catch (e) {
      console.error(e);
      return "A custom route perfect for all skill levels.";
    }
  },

  async getCoachingTips(run: RunHistory): Promise<string> {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `I just finished a run. 
        Distance: ${run.distance}km
        Duration: ${Math.floor(run.duration / 60)} minutes
        Average Pace: ${run.averagePace} min/km
        Route: ${run.routeName}
        
        Provide a single paragraph of motivational coaching advice based on this performance. 
        Keep it encouraging and brief.`
      });
      return response.text || "Keep up the great work! Consistency is key to improvement.";
    } catch (e) {
      console.error(e);
      return "Excellent effort today! Focus on recovery and hydration.";
    }
  }
};
