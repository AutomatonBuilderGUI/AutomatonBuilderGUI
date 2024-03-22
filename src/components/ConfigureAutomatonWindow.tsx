import { useEffect, useState } from "react";
import TokenWrapper from "../TokenWrapper";
import StateManager from "../StateManager";
import { CoreListItem, CoreListItem_Left, ListItem } from "./ListItem";
import { BsPlusCircleFill, BsXCircleFill } from "react-icons/bs";

interface ListItem_TokenEditorProps {
    tokenWrapper: TokenWrapper
    removeFunc: (tk: TokenWrapper) => void
}

function ListItem_TokenEditor(props: React.PropsWithChildren<ListItem_TokenEditorProps>) {
    const tw = props.tokenWrapper;
    const [tokenSymbol, setTokenSymbol] = useState(tw.symbol);

    useEffect(() => {
        tw.symbol = tokenSymbol;
    }, [tokenSymbol]);

    return (
        <CoreListItem>
            <div className="flex flex-row">
                <div className="flex-1 grow float-left">
                    <input className="focus:outline-none bg-transparent" type="text" minLength={1} maxLength={1} placeholder="Token symbol" value={tokenSymbol} onChange={e => setTokenSymbol(e.target.value)}></input>
                </div>
                <button className="flex-0 float-right px-2 block text-center text-red-500 align-middle" onClick={() => props.removeFunc(tw)}>
                    <BsXCircleFill />
                </button>
            </div>

        </CoreListItem>
    )
}

function AlphabetList() {
    // UNDERLYING IDEA HERE: Alphabet is stored in the React component's state.
    // Whenever the React state variables are changed, push them to the StateManager.

    const [alphabet, setAlphabet] = useState(StateManager.alphabet);

    function addTokenToAlphabet() {
        const newAlphabet = [...alphabet];
        newAlphabet.push(new TokenWrapper());
        setAlphabet(newAlphabet);
    }

    function removeTokenFromAlphabet(tk: TokenWrapper) {
        const newAlphabet = alphabet.filter(i => i !== tk);
        setAlphabet(newAlphabet);
    }

    useEffect(() => {
        StateManager.alphabet = alphabet;
    }, [alphabet]);

    const tokenWrapperElements = alphabet.map(tw => <ListItem_TokenEditor tokenWrapper={tw} removeFunc={removeTokenFromAlphabet} key={tw.id} />);

    return (<>
        <div className="mt-3 ml-1 mb-1">
            Input Alphabet
        </div>
        <div className="divide-y">
            {tokenWrapperElements}
            <CoreListItem>
                <CoreListItem_Left>
                    <button className="text-blue-500 dark:text-blue-400 flex flex-row items-center" onClick={addTokenToAlphabet}>
                        <BsPlusCircleFill className="mr-1"/>
                        Add Token
                    </button>
                </CoreListItem_Left>
            </CoreListItem>
        </div>
    </>);
}
export default function ConfigureAutomatonWindow() {
    const faTypeSelector = (
        <select name="automaton-type" id="automaton-type" className="float-right align-bottom dark:text-black">
            <option value="dfa">DFA</option>
            <option value="nfa">NFA</option>
        </select>
    );

    const closeConfigWindow = () => {
        console.log('close me');
    };

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