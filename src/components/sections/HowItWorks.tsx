import Cards from "@/components/ui/Cards";
import Section from "@/components/ui/Section";

/** "How it works": matching decompilation in three steps. */
export default function HowItWorks() {
  return (
    <Section id="how" title="How it works" sub="Matching decompilation, in three steps.">
      <Cards
        items={[
          ["Disassemble", "Your own copy of the game is split into code and data. Nothing extracted from it is ever stored in the repository."],
          ["Rewrite", "We write plain C for each function and compile it with the same compiler and flags the original developers used."],
          ["Verify", "If the output matches the original bytes exactly, the function counts as done. The build and progress report are public and reproducible."],
        ]}
      />
    </Section>
  );
}
