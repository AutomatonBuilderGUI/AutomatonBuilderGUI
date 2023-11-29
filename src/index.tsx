import StateManager from './StateManager';
import { Tool } from './Tool';
import { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import NodeView from './components/NodeView';
import Toolbox from './components/Toolbox';
import FloatingPanel from './components/FloatingPanel';
import SelectableObject from './SelectableObject';
import DetailsBox from './components/DetailsBox/DetailsBox';
import ModalWindow, { ClosableModalWindow } from './components/ModalWindow';
import ConfigureAutomatonWindow from './components/ConfigureAutomatonWindow';
import { BsGearFill } from 'react-icons/bs';

function App() {
    const [currentTool, setCurrentTool] = useState(Tool.States);
    const [selectedObjects, setSelectedObjects] = useState(new Array<SelectableObject>());
    const [startNode, setStartNode] = useState(StateManager.startNode);

    // Switch current tool when keys pressed
    useEffect(() => {
        StateManager.setSelectedObjects = setSelectedObjects;
        addEventListener('keydown', (ev: KeyboardEvent) => {
            // Ignore keyboard shortcuts if user is in a text box.
            // Solution from https://stackoverflow.com/a/4575309
            const n = document.activeElement.nodeName;
            if (n == 'TEXTAREA' || n == 'INPUT') {
                return;
            }

            if (ev.code === "KeyA") {
                setCurrentTool(Tool.States);
            }
            else if (ev.code === "KeyT") {
                setCurrentTool(Tool.Transitions);
            }
            else if (ev.code === "KeyS") {
                setCurrentTool(Tool.Select);
            }

            else if (ev.code === "KeyW") {
                console.log(StateManager.toJSON());
            }
        });
    }, []);

    useEffect(() => {
        StateManager.currentTool = currentTool;
    }, [currentTool]);

    useEffect(() => {
        StateManager.selectedObjects = selectedObjects;
    }, [selectedObjects]);

    useEffect(() => {
        StateManager.startNode = startNode;
    }, [startNode]);


    // Config window
    const [configWindowOpen, setConfigWindowOpen] = useState(false);
    const openConfigWindow = () => { setConfigWindowOpen(true); };
    const closeConfigWindow = () => { setConfigWindowOpen(false); };
        return (
            <>
                <NodeView />
                <div className='flex flex-row h-screen text-center'>
                    <div style={{ width: '300px' }}> {/* Set a fixed width for the properties panel */}
                        <FloatingPanel heightPolicy='min'>
                            <DetailsBox
                                selection={selectedObjects}
                                startNode={startNode}
                                setStartNode={setStartNode}
                            />
                            <button className="rounded-full p-2 m-1 mx-2 block bg-amber-500 text-white text-center" onClick={openConfigWindow}>
                                <div className='flex flex-row items-center place-content-center mx-2'>
                                    <BsGearFill className='mr-1' />
                                    Configure Automaton
                                </div>
                            </button>
                        </FloatingPanel>
                    </div>
                    <FloatingPanel heightPolicy='min'>
                        <Toolbox currentTool={currentTool} setCurrentTool={setCurrentTool} />
                    </FloatingPanel>
                </div>
    
                {configWindowOpen ? <ClosableModalWindow title='Configure Automaton' close={closeConfigWindow}><ConfigureAutomatonWindow /></ClosableModalWindow> : <></>}
            </>
        );
    }

const domNode = document.getElementById('react-root');
const root = createRoot(domNode);
root.render(<App />);
