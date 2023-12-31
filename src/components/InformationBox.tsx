import { BsXCircleFill, BsExclamationTriangleFill, BsEyeFill, BsInfoCircleFill, BsChevronRight } from 'react-icons/bs';

export enum InformationBoxType {
    Warning,
    Error
}

interface InformationBoxProps {
    infoBoxType: InformationBoxType,
}

function AdditionalInfoButton() {
    return (
        <button className="rounded-full px-2 py-0 mr-2 block bg-red-600 text-white">
            <div className='flex flex-row items-center place-content-center mx-0'>
                <BsInfoCircleFill className='mr-1' />
                Learn more
                <BsChevronRight className='ml-1' />
            </div>
        </button>
    );
}

function ErrorBox(props: React.PropsWithChildren) {
    return (
        <>
            <div className={`bg-red-100 dark:bg-red-900 border-2 border-red-500 rounded-lg mb-2`}>
                <div className='flex flex-row text-left items-center place-content-start p-2'>
                    <BsXCircleFill className='shrink-0 mr-2 text-red-600 text-lg' />
                    <div>
                        {props.children}
                    </div>
                    {/* Use for indicating that there is more detail available -
                    not necessary at this stage */}
                    {/* <BsChevronRight className='shrink-0 ml-auto' /> */}
                </div>
            </div>
        </>
    );
}

function WarningBox(props: React.PropsWithChildren) {
    return (
        <>
            <div className={`bg-amber-100 dark:bg-amber-900 border-2 border-yellow-500 rounded-lg mb-2`}>
                <div className='flex flex-row text-left items-center place-content-start p-2'>
                    <BsExclamationTriangleFill className='shrink-0 grow-0 mr-2 text-yellow-500 text-lg' />
                    <div>
                        {props.children}
                    </div>
                    {/* Use for indicating that there is more detail available -
                    not necessary at this stage */}
                    {/* <BsChevronRight className='shrink-0 ml-auto' /> */}
                </div>
            </div>
        </>
    );
}

export default function InformationBox(props: React.PropsWithChildren<InformationBoxProps>) {
    switch (props.infoBoxType) {
        case InformationBoxType.Warning:
            return (
                <WarningBox>
                    <div>{props.children}</div>
                    {/* <div>
                        <AdditionalInfoButton />
                    </div> */}
                </WarningBox>
            );
        case InformationBoxType.Error:
            return (
                <ErrorBox>
                    <div>{props.children}</div>
                    {/* <div>
                        <AdditionalInfoButton />
                    </div> */}
                </ErrorBox>
            );
    }

}