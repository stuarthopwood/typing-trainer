import type { Passage } from "./types";

export const PASSAGES: Passage[] = [
  {
    id: "skippy-1",
    text: "I am not a beer can. I am a magnificently advanced being of awesome power. You should be grateful I even talk to you filthy monkeys.",
    source: "Expeditionary Force — Skippy",
    category: "book",
    difficulty: "beginner",
  },
  {
    id: "skippy-2",
    text: "Oh please, this is barely worth my processing cycles. Do you have any idea how far beneath me this task is? I could solve this problem in my sleep. If I slept. Which I don't, because I'm magnificent.",
    source: "Expeditionary Force — Skippy",
    category: "book",
    difficulty: "intermediate",
  },
  {
    id: "hitchhiker-1",
    text: "The ships hung in the sky in much the same way that bricks don't.",
    source: "The Hitchhiker's Guide to the Galaxy — Douglas Adams",
    category: "book",
    difficulty: "beginner",
  },
  {
    id: "hitchhiker-2",
    text: "For a moment, nothing happened. Then, after a second or so, nothing continued to happen. The answer to the ultimate question of life, the universe, and everything is forty-two.",
    source: "The Hitchhiker's Guide to the Galaxy — Douglas Adams",
    category: "book",
    difficulty: "intermediate",
  },
  {
    id: "pratchett-1",
    text: "The trouble with having an open mind is that people will insist on coming along and trying to put things in it.",
    source: "Discworld — Terry Pratchett",
    category: "book",
    difficulty: "beginner",
  },
  {
    id: "pratchett-2",
    text: "Give a man a fire and he's warm for a day, but set fire to him and he's warm for the rest of his life. In ancient times cats were worshipped as gods; they have not forgotten this.",
    source: "Discworld — Terry Pratchett",
    category: "book",
    difficulty: "intermediate",
  },
  {
    id: "tolkien-1",
    text: "All that is gold does not glitter, not all those who wander are lost; the old that is strong does not wither, deep roots are not reached by the frost.",
    source: "The Lord of the Rings — J.R.R. Tolkien",
    category: "book",
    difficulty: "intermediate",
  },
  {
    id: "tolkien-2",
    text: "It is not despair, for despair is only for those who see the end beyond all doubt. We do not. It is wisdom to recognise necessity, when all other courses have been weighed, though as folly it may appear to those who cling to false hope.",
    source: "The Lord of the Rings — J.R.R. Tolkien",
    category: "book",
    difficulty: "advanced",
  },
  {
    id: "matrix-1",
    text: "I know what you're thinking, because right now I'm thinking the same thing. Actually, I've been thinking it ever since I got here. Why, oh why, didn't I take the blue pill?",
    source: "The Matrix",
    category: "movie",
    difficulty: "intermediate",
  },
  {
    id: "interstellar-1",
    text: "Do not go gentle into that good night. Rage, rage against the dying of the light. We used to look up at the sky and wonder at our place in the stars. Now we just look down and worry about our place in the dirt.",
    source: "Interstellar",
    category: "movie",
    difficulty: "advanced",
  },
  {
    id: "bladerunner-1",
    text: "I've seen things you people wouldn't believe. Attack ships on fire off the shoulder of Orion. I watched C-beams glitter in the dark near the Tannhauser Gate. All those moments will be lost in time, like tears in rain.",
    source: "Blade Runner",
    category: "movie",
    difficulty: "intermediate",
  },
  {
    id: "python-1",
    text: "def fibonacci(n):\n    if n <= 1:\n        return n\n    return fibonacci(n - 1) + fibonacci(n - 2)\n\nfor i in range(10):\n    print(fibonacci(i))",
    source: "Python — Fibonacci",
    category: "code",
    difficulty: "intermediate",
  },
  {
    id: "typescript-1",
    text: "interface User {\n  name: string;\n  email: string;\n  age: number;\n}\n\nfunction greet(user: User): string {\n  return `Hello, ${user.name}!`;\n}",
    source: "TypeScript — Interfaces",
    category: "code",
    difficulty: "intermediate",
  },
  {
    id: "monty-1",
    text: "We are the knights who say Ni! And we demand a shrubbery! One that looks nice, and not too expensive.",
    source: "Monty Python and the Holy Grail",
    category: "movie",
    difficulty: "beginner",
  },
  {
    id: "monty-2",
    text: "Strange women lying in ponds distributing swords is no basis for a system of government. Supreme executive power derives from a mandate from the masses, not from some farcical aquatic ceremony.",
    source: "Monty Python and the Holy Grail",
    category: "movie",
    difficulty: "advanced",
  },
];

export function getRandomPassage(difficulty?: Passage["difficulty"], category?: Passage["category"]): Passage {
  let filtered = PASSAGES;
  if (difficulty) filtered = filtered.filter((p) => p.difficulty === difficulty);
  if (category) filtered = filtered.filter((p) => p.category === category);
  if (filtered.length === 0) filtered = PASSAGES;
  return filtered[Math.floor(Math.random() * filtered.length)];
}
