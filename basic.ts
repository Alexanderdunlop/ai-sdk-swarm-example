import "dotenv/config";
import { openai } from "@ai-sdk/openai";
import { Agent, runSwarm } from "@ai-sdk/swarm";
import { z } from "zod";

const agentA = new Agent({
  name: "Agent A",
  system: "You are a helpful agent.",
  tools: {
    transferToAgentB: {
      type: "handover",
      parameters: z.object({}),
      execute: () => ({ agent: agentB }),
    },
  },
});

const agentB = new Agent({
  name: "Agent B",
  system: "Only speak in Haikus.",
});

const main = async () => {
  const { text } = await runSwarm({
    agent: agentA,
    context: {},
    model: openai("gpt-4o", { structuredOutputs: true }),
    prompt: "I want to talk to agent B.",
  });
  console.log(text);
};

main().catch(console.error);
