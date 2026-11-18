import { useState, useEffect } from "react";
import StateManager from "../../StateManager";
import TransitionWrapper from "../../TransitionWrapper";
import TokenWrapper from "../../TokenWrapper";
import { useActionStack } from "../../utilities/ActionStackUtilities";
import { ListItem } from "../ListItem";
import Toolbox from "../Toolbox";

interface DetailsBox_TransitionSelectionProps {
  transitions: TransitionWrapper[];
  isDebugActive: boolean;
}

interface DetailsBox_TransitionTokenCheckBoxProps {
  transitions: TransitionWrapper[];
  token: TokenWrapper;
  isDebugActive: boolean;
}

/**
 * Creates a list item representing a single token's relationship to the given
 * transition(s). If the checkbox is checked, then the transition(s) will accept the
 * token.
 * @param props
 * @param {TransitionWrapper[]} props.transitions The transition(s) that this list
 * item corresponds to.
 * @param {TokenWrapper} props.token The token that this list item corresponds to.
 * @param {boolean} props.isDebugActive Whether or now we are in debug mode
 * @returns
 */
function DetailsBox_TransitionTokenCheckBox(
  props: DetailsBox_TransitionTokenCheckBoxProps,
) {
  const token = props.token;
  const transitions = props.transitions;

  const allInclude = transitions.every((t) => t.hasToken(token));
  const noneInclude = transitions.every((t) => !t.hasToken(token));

  const [tokenIsIncluded, setTokenIsIncluded] = useState(
    noneInclude ? false : allInclude || undefined,
  );

  let updateTokenIsIncluded = (isIncluded: boolean) => {
    if (props.isDebugActive) return;
    setTokenIsIncluded(isIncluded);

    if (isIncluded) {
      transitions.forEach((t) => {
        if (t.hasToken(token)) return;
        StateManager.setTransitionAcceptsToken(t, token);
      });
    } else {
      transitions.forEach((t) => {
        if (!t.hasToken(token)) return;
        StateManager.setTransitionDoesntAcceptToken(t, token);
      });
    }
  };

  const [_, currentStackLocation] = useActionStack();
  useEffect(() => {
    setTokenIsIncluded(noneInclude ? false : allInclude || undefined);
  }, [currentStackLocation]);

  let transitionUseTokenInput = (
    <input
      type="checkbox"
      id="is-epsilon-transition"
      name="is-epsilon-transition"
      checked={tokenIsIncluded}
      disabled={props.isDebugActive}
      ref={(input) => {
        if (input) {
          input.indeterminate = tokenIsIncluded === undefined;
        }
      }}
      onChange={(e) => updateTokenIsIncluded(e.target.checked)}
    ></input>
  );

  return (
    <ListItem
      key={token.id}
      title={token.symbol}
      rightContent={transitionUseTokenInput}
    />
  );
}

/**
 * Creates the UI for enabling and disabling tokens for a given transition(s).
 * @param props
 * @param {TransitionWrapper[]} props.transitios The transition(s) that this editor
 * will modify.
 * @param {boolean} props.isDebugActive whether or not we are in debug mode
 * @returns
 */
export default function DetailsBox_TransitionSelection(
  props: DetailsBox_TransitionSelectionProps,
) {
  const tws = props.transitions;

  const srcNode = tws[0].sourceNode;
  const dstNode = tws[0].destNode;

  const isMultiSelection = tws.length > 1;

  const allEpsilon = tws.every((t) => t.isEpsilonTransition);
  const noneEpsilon = tws.every((t) => !t.isEpsilonTransition);

  // Epsilon transitions are handled separately from individual tokens.
  const [isEpsilonTransition, setEpsilonTransition] = useState(
    noneEpsilon ? false : allEpsilon || undefined,
  );
  let updateIsEpsilonTransition = (isEpsilon: boolean) => {
    if (props.isDebugActive) return;
    setEpsilonTransition(isEpsilon);

    if (isEpsilon) {
      tws.forEach((t) => {
        if (t.isEpsilonTransition) return;
        StateManager.setTransitionAcceptsEpsilon(t);
      });
    } else {
      tws.forEach((t) => {
        if (!t.isEpsilonTransition) return;
        StateManager.setTransitionDoesntAcceptEpsilon(t);
      });
    }
  };

  let transitionUseEpsilonInput = (
    <input
      type="checkbox"
      id="is-epsilon-transition"
      name="is-epsilon-transition"
      checked={isEpsilonTransition}
      disabled={props.isDebugActive}
      ref={(input) => {
        if (input) {
          input.indeterminate = isEpsilonTransition === undefined;
        }
      }}
      onChange={(e) => updateIsEpsilonTransition(e.target.checked)}
    ></input>
  );

  // Track the action stack's location so that any undo/redo commands will
  // update the UI to correctly reflect the current state.
  const [_, currentStackLocation] = useActionStack();
  useEffect(() => {
    setEpsilonTransition(noneEpsilon ? false : allEpsilon || undefined);
  }, [currentStackLocation]);

  return (
    <div className="flex flex-col">
      <div className="font-medium text-2xl">
        {isMultiSelection ? "Transitions" : "Transition"}
      </div>
      {!isMultiSelection && (
        <div>
          {srcNode.labelText} to {dstNode.labelText}
        </div>
      )}
      <div className="mt-3 ml-1 mb-1 text-left">Accepted Tokens</div>
      <div className="divide-y mb-3">
        <ListItem title="ε" rightContent={transitionUseEpsilonInput} />
        {StateManager.alphabet.map((token) => (
          <DetailsBox_TransitionTokenCheckBox
            transitions={tws}
            token={token}
            isDebugActive={props.isDebugActive}
          />
        ))}
      </div>
    </div>
  );
}
