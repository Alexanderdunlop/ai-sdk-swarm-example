import "dotenv/config";
import { openai } from "@ai-sdk/openai";
import { Agent, runSwarm } from "@ai-sdk/swarm";
import { CoreMessage } from "ai";
import * as fs from "fs";
import * as readline from "node:readline/promises";
import { z } from "zod";

const fileText = fs.readFileSync("./data/2024-world-series.txt", "utf8");

const terminal = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

type Context = { text: string; speechType?: string; targetLanguage?: string };

const translator = new Agent<Context>({
  name: "Translator",
  system: ({ text, targetLanguage }) =>
    `Translate the following text to ${targetLanguage}:\n\n${text}`,
});

const summarizer = new Agent<Context>({
  name: "Summarizer",
  system: ({ text }) => `Summarize the following text :\n\n${text}`,
});

const rewriter = new Agent<Context>({
  name: "Rewriter",
  system: ({ text, speechType }) =>
    `Rewrite the following text in ${speechType}:\n\n${text}`,
});

const manager = new Agent<Context>({
  name: "Manager",
  system: "You transfer conversations to the appropriate agent.",
  tools: {
    transferToTranslator: {
      type: "handover",
      parameters: z.object({
        targetLanguage: z.string(),
      }),
      execute: ({ targetLanguage }, { context }) => {
        console.log("context", context);
        return {
          agent: translator,
          context: { targetLanguage, text: context.text },
        };
      },
    },
    transferToSummarizer: {
      type: "handover",
      parameters: z.object({}),
      execute: () => ({
        agent: summarizer,
      }),
    },
    transferToRewriter: {
      type: "handover",
      parameters: z.object({}),
      execute: () => ({
        agent: rewriter,
      }),
    },
  },
});

const main = async () => {
  const messages: CoreMessage[] = [];

  while (true) {
    const userContent = await terminal.question("You: ");

    let updatedText = fileText;

    const { text: newText, responseMessages } = await runSwarm({
      agent: manager,
      context: { text: updatedText },
      model: openai("gpt-4o", { structuredOutputs: true }),
      prompt: [
        {
          role: "user",
          content: userContent,
        },
      ],
      debug: true,
    });

    console.log("newText", newText);
    messages.push(...responseMessages);
    updatedText = newText;

    messages.forEach((message) => {
      console.log();
      console.log(`${message.role}: ${JSON.stringify(message.content)}`);
    });
    console.log();
    console.log();
    console.log();
    console.log(updatedText);
  }
};

main().catch(console.error);
