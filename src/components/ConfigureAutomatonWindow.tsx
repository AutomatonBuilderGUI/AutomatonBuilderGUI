import { useEffect, useState } from "react";
import TokenWrapper from "../TokenWrapper";
import StateManager from "../StateManager";
import {
  CoreListItem,
  CoreListItem_Left,
  CoreListItem_Right,
  ListItem,
} from "./ListItem";
import { BsPlusCircleFill, BsXCircleFill } from "react-icons/bs";
import { useActionStack } from "../utilities/ActionStackUtilities";

interface ListItem_TokenEditorProps {
  token: TokenWrapper;
}

/**
 * The editor for a single token within the automaton. From here, the user can
 * edit the token's symbol or remove it from the automaton.
 * @param props
 * @param {TokenWrapper} props.token The token that this list item will edit.
 * @returns
 */
function ListItem_TokenEditor(
  props: React.PropsWithChildren<ListItem_TokenEditorProps>,
) {
  const tw = props.token;
  const [tokenSymbol, setTokenSymbol] = useState(tw.symbol);

  let updateTokenSymbol = (newSymbol: string) => {
    setTokenSymbol(newSymbol);
    StateManager.setTokenSymbol(tw, newSymbol);
  };

  // Track the action stack's location so that any undo/redo commands will
  // update the UI to correctly reflect the current state.
  const [_, currentStackLocation] = useActionStack();
  useEffect(() => {
    setTokenSymbol(tw.symbol);
  }, [currentStackLocation]);

  return (
    <CoreListItem>
      {/* Text field to input token's name/label */}
      <CoreListItem_Left>
        <input
          className="focus:outline-none bg-transparent grow"
          type="text"
          minLength={1}
          maxLength={1}
          placeholder="Token symbol"
          value={tokenSymbol}
        ></input>
      </CoreListItem_Left>

      {/* Button to delete token */}
      <CoreListItem_Right>
        <button
          className="flex-0 float-right px-2 block text-center text-red-500 align-middle"
          onClick={() => StateManager.removeToken(tw)}
        >
          <BsXCircleFill />
        </button>
      </CoreListItem_Right>
    </CoreListItem>
  );
}

/**
 * The UI with the list of tokens in the current alphabet. An "Add Token"
 * button is included,so the user can add more tokens to the alphabet.
 * @returns
 */
function AlphabetList() {
  const [alphabet, setAlphabet] = useState<TokenWrapper[]>([]);
  const [inputValue, setInputValue] = useState("");

  function addTokenToAlphabet() {
    const newSymbols = new Set(inputValue.split(',').map(token => token.trim()));
    const newSymbolsArray = Array.from(newSymbols);
    StateManager.addTokensWithSymbols(newSymbolsArray);
    setInputValue("");
  }

  const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      addTokenToAlphabet();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  // Track the action stack's location so that any undo/redo commands will
  // update the UI to correctly reflect the current state.
  const [_, currentStackLocation] = useActionStack();
  useEffect(() => {
    setAlphabet(StateManager.alphabet);
  }, [currentStackLocation]);

  const tokenWrapperElements = alphabet.map((tw) => (
    <ListItem_TokenEditor token={tw} key={tw.id} />
  ));

  return (
    <>
      <div className="mt-3 ml-1 mb-1">Input Alphabet</div>
      <div className="divide-y">
        <CoreListItem>
          <CoreListItem_Left>
            <input
              className="focus:outline-none bg-transparent grow"
              type="text"
              placeholder="q1,q2,q3"
              value={inputValue}
              onChange={handleChange}
              onKeyUp={handleKeyUp}
            />
          </CoreListItem_Left>
        </CoreListItem>
        {tokenWrapperElements}
      </div>
    </>
  );
}

/**
 * The content for a window that allows the user to set information about
 * their automaton that does not fit on the main screen. Currently, this just
 * includes the alphabet.
 * @returns
 */
export default function ConfigureAutomatonWindow() {
  // NOTE: The "Automaton Type" dropdown doesn't currently do anything in the
  // actual program. Eventually, it will be used to change how the automaton
  // is evaluated.
  const faTypeSelector = (
    <select
      name="automaton-type"
      id="automaton-type"
      className="float-right align-bottom dark:text-black"
    >
      <option value="dfa">DFA</option>
      <option value="nfa">NFA</option>
    </select>
  );

  return (
    <div className="">
      <div className="divide-y">
        <ListItem
          title="Automaton Type"
          subtitle="An NFA will have fewer requirements than a DFA."
          rightContent={faTypeSelector}
        />
      </div>
      <AlphabetList />
    </div>
  );
}
