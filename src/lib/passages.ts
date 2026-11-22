export interface Passage {
  id: string;
  title: string;
  level: 'easy' | 'medium' | 'hard';
  text: string;
}

/** Original practice passages written for this app. */
export const PASSAGES: Passage[] = [
  { id: 'harbour', title: 'Morning harbour', level: 'easy', text: 'The boats rock gently as the sun comes up over the harbour. A gull lands on a post and looks around. Somewhere a radio plays an old song, and the smell of fresh bread drifts down from the bakery on the hill.' },
  { id: 'garden', title: 'Small garden', level: 'easy', text: 'She planted beans along the fence and herbs in old tins by the door. Every evening she watered them and wrote down what had grown. By summer the notebook was full and so was the kitchen table.' },
  { id: 'trains', title: 'Night trains', level: 'medium', text: 'Night trains have a rhythm of their own: the soft clatter over joints, the sudden hush of a tunnel, the brief glow of a station platform at 3 a.m. Passengers read, doze, or stare at their reflections while whole regions pass unseen.' },
  { id: 'library', title: 'The repair café', level: 'medium', text: 'Once a month, volunteers set up tables in the library: one for lamps, one for bikes, one for clothes. People queue with broken toasters and torn jackets. Most things are fixed within an hour; the rest go home with a plan and a list of parts.' },
  { id: 'data', title: 'Version numbers', level: 'hard', text: 'Release 2.14.0 (build #8812) fixed 37 bugs, including one where "save & exit" ignored the -f flag. Users on v1.x should read docs/upgrade.md first; the config key max_retries=3 is now maxRetries: 3 — note the camelCase.' },
  { id: 'kitchen', title: 'Recipe card', level: 'hard', text: 'Whisk 2 eggs, 120 ml milk and ½ tsp salt; fold in 150 g flour (sifted!). Rest 20–30 min. Heat a pan to ~180 °C, add 1 tbsp butter, and cook each side for 90 s. Makes 8–10 crêpes; double it for 4+ people.' },
];
