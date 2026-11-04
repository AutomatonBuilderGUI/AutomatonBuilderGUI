import StateManager from "../StateManager";
import * as React from "react";

function idToSymbolState(id: string): string {
  const data = StateManager.toSerializable();
  return data.states.find((value) => {
    return value.id == id;
  }).label;
}

function idToSymbolChar(id: string): string {
  const data = StateManager.toSerializable();
  return data.alphabet.find((value) => {
    return value.id == id;
  }).symbol;
}

export function FiveTuplesDisplay() {
  const data = StateManager.toSerializable();
  return (
    <>
      <div>
        <p>
          Q = {"{"}{" "}
          {data.states.map((d, index) => (
            <strong key={d.id}>
              {d.label}
              {index < data.states.length - 1 ? ", " : ""}{" "}
            </strong>
          ))}{" "}
          {"}"}
        </p>
        <p>
          F ={" "}
          {data.acceptStates.map((d) => (
            <strong key={d}>
              {
                data.states.find((value) => {
                  return d == value.id;
                }).label
              }
            </strong>
          ))}
        </p>
        <p>
          Σ = {"{"}{" "}
          {data.alphabet.map((d, index) => (
            <strong key={d.id}>
              {d.symbol}
              {index < data.alphabet.length - 1 ? ", " : ""}
            </strong>
          ))}{" "}
          {"}"}
        </p>
        <p>
          q0 ={" "}
          <strong>
            {
              data.states.find((value) => {
                return data.startState == value.id;
              }).label
            }
          </strong>{" "}
        </p>
        <TransitionTable />
      </div>
    </>
  );
}

function TransitionTable() {
  const data = StateManager.toSerializable();
  data.transitions.sort((a, b) => {
    if (a.source !== b.source) {
      return a.source.localeCompare(b.source);
    } else {
      return a.id.localeCompare(b.id);
    }
  });
  console.log(data);
  const alphabet = data.alphabet.map((value) => value.id);
  const states = data.states.map((value) => value.id);

  const transitions: Record<string, Record<string, Array<string>>> = {};

  for (const state of states) transitions[idToSymbolState(state)] = {};

  for (const state of states) {
    for (const char of alphabet) {
      console.log(`${state}, ${char}`);
      const transfer = data.transitions.find((value) => {
        return value.source == state && value.tokens.includes(char);
      });
      if (transfer) {
        transitions[idToSymbolState(transfer.source)][
          idToSymbolState(transfer.dest)
        ] = transfer.tokens.map(idToSymbolChar);
      }
    }
  }

  const isCellEmpty = (state: string, symbol: string) => {
    const values = Object.entries(transitions[state] ?? {})
      .filter(([, symbols]) => symbols.includes(symbol))
      .map(([value]) => value);

    if (values.length) {
      //if anything return a list of the values
      return values.join(", ");
    }
    return "∅"; //otherwise empty set
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <table className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-700 border-b border-slate-200">
          <tr>
            <th scope="col" className="px-6 py-4">
              Σ
            </th>
            {data.alphabet.map((d) => (
              <th key={d.id} scope="col" className="px-6 py-4">
                {d.symbol}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {Object.keys(transitions).map((state) => (
            <tr key={state}>
              <th scope="row" className="px-6 py-4">
                {state}
              </th>
              {data.alphabet.map((d) => (
                <td key={d.id} className="px-6 py-4">
                  {isCellEmpty(state, d.symbol)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
