/**
 * A representation of an automaton that can be converted to and from a JSON
 * string.
 */
export interface SerializableAutomaton {
  states: Array<SerializableState>;
  alphabet: Array<SerializableToken>;
  transitions: Array<SerializableTransition>;
  startState: string;
  acceptStates: Array<string>;
}

/**
 * A representation of a node that can be converted to and from a JSON string.
 */
export interface SerializableState {
  id: string;
  x: number;
  y: number;
  label: string;
}

/**
 * A representation of a token that can be converted to and from a JSON string.
 */
export interface SerializableToken {
  id: string;
  symbol: string;
}

/**
 * A representation of a transition that can be converted to and from a JSON
 * string.
 */
export interface SerializableTransition {
  id: string;
  source: string;
  dest: string;
  isEpsilonTransition: boolean;
  tokens: Array<string>;
}
