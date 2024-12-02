import { fetchWeatherApi } from "openmeteo";
import { openai } from "@ai-sdk/openai";
import { generateText, tool } from "ai";
import "dotenv/config";
import { z } from "zod";
import { differenceInDays } from "date-fns";

const calculateDaysFromNow = (endDate: Date): number => {
  const today = new Date();
  return differenceInDays(endDate, today);
};

const main = async () => {
  const result = await generateText({
    model: openai("gpt-4o-mini"),
    system:
      `You help planning travel itineraries. ` +
      `You have access to a weather API and a list of attractions. ` +
      `Firstly provide the weather forecast for the dates the user is traveling. ` +
      `Then respond with to the users' request with a list ` +
      `of the best activities to do in their destination.`,
    prompt: "I am going to Luxembourg on this 6/12/24 - 8/12/24.",
    tools: {
      getWeather: {
        description: "Get the current weather at a location for specific dates",
        parameters: z.object({
          latitude: z.number(),
          longitude: z.number(),
          endDate: z.string(),
        }),
        execute: async ({ latitude, longitude, endDate }) => {
          const forecastDays = calculateDaysFromNow(new Date(endDate));
          const params = {
            latitude: latitude,
            longitude: longitude,
            daily: ["temperature_2m_max", "temperature_2m_min"],
            forecast_days: forecastDays,
          };
          const url = "https://api.open-meteo.com/v1/forecast";
          const responses = await fetchWeatherApi(url, params);
          const response = responses[0];
          const daily = response.daily()!;
          return daily;
        },
      },
      attractions: tool({
        description: "Get the attractions in a location",
        parameters: z.object({
          location: z
            .string()
            .describe("The location to get the attractions for"),
          temperature: z
            .number()
            .describe("The current temperature in Celsius"),
          date: z.string().describe("The date to get the attractions for"),
        }),
        execute: async ({ location, temperature, date }) => {
          const result = await generateText({
            model: openai("gpt-4o-mini"),
            prompt: `What are 3 attractions in ${location} that I should see given it is ${temperature} outside and the ${date} is?`,
          });
          return result.text;
        },
      }),
    },
    maxSteps: 5,
  });

  console.log(result.steps.map((step) => step.stepType).join("\n"));
  console.log(result.text);
};

main().catch(console.error);
