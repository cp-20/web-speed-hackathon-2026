import type { IpadicFeatures, Tokenizer } from "kuromoji";
import analyze from "negaposi-analyzer-ja";

let tokenizerPromise: Promise<Tokenizer<IpadicFeatures>> | undefined;

async function getTokenizer(): Promise<Tokenizer<IpadicFeatures>> {
  if (tokenizerPromise) {
    return tokenizerPromise;
  }

  tokenizerPromise = (async () => {
    const kuromojiModule = await import("kuromoji");
    return await new Promise<Tokenizer<IpadicFeatures>>((resolve, reject) => {
      kuromojiModule.default.builder({ dicPath: "/dicts" }).build(
        (error, tokenizer) => {
          if (error) {
            reject(error);
            return;
          }
          resolve(tokenizer);
        },
      );
    });
  })();

  return tokenizerPromise;
}

type SentimentResult = {
  score: number;
  label: "positive" | "negative" | "neutral";
};

export async function analyzeSentiment(text: string): Promise<SentimentResult> {
  const tokenizer = await getTokenizer();
  const tokens = tokenizer.tokenize(text);

  const score = analyze(tokens);

  let label: SentimentResult["label"];
  if (score > 0.1) {
    label = "positive";
  } else if (score < -0.1) {
    label = "negative";
  } else {
    label = "neutral";
  }

  return { score, label };
}
