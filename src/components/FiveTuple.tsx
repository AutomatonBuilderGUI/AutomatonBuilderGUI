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

export function FiveTupleDisplay() {
  const data = StateManager.toSerializable();

  if (data.states.length == 0) {
    return (
      <div className="text-center">
        <h1 className="font-bold">Machine has no states</h1>
        <p>Construct a machine to get a 5 tuple definition</p>
      </div>
    );
  }

  return (
    <>
      <div className="text-center">
        <p>
          M = (Q, Σ, δ,{" "}
          {
            data.states.find((value) => {
              return data.startState == value.id;
            }).label
          }
          , F)
        </p>
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
          F = {"{ "}
          {data.acceptStates.map((d, index) => (
            <strong key={d}>
              {
                data.states.find((value) => {
                  return d == value.id;
                }).label
              }
              {index < data.acceptStates.length - 1 ? ", " : ""}
            </strong>
          ))}{" "}
          {"}"}
        </p>
        <h1 className="text-center font-bold underline">δ</h1>
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
  const states = data.states.map((value) => value.id);

  const transitions: Record<string, Record<string, Array<string>>> = {};

  for (const state of states) transitions[idToSymbolState(state)] = {};

  for (const t of data.transitions) {
    const row = transitions[idToSymbolState(t.source)];
    const dest = idToSymbolState(t.dest);

    for (const token of t.tokens) {
      const symbol = idToSymbolChar(token);
      row[symbol] ??= [];
      if (!row[symbol].includes(dest)) row[symbol].push(dest);
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <table className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <thead className="bg-slate-50 text-xs font-semibold tracking-wider text-slate-700 border-b border-slate-200">
          <tr>
            <th scope="col" className="px-6 py-4">
              q
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
                  {transitions[state][d.symbol]?.join(", ") ?? "∅"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
