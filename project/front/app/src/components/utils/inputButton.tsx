import React, {useState} from 'react';

export function ButtonInputToggle({onInputSubmit, textInButton, placeHolder, classInput, classButton}: {
	onInputSubmit: (value: string) => void,
	textInButton: string,
	placeHolder: string,
	classInput: string,
	classButton: string
}) {
	const [showInput, setShowInput] = useState(false);
	const [inputValue, setInputValue] = useState('');

	const handleButtonClick = () => {
		setShowInput(true);
	}

	const handleInputKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
		if (event.key === 'Enter' && inputValue.length > 0) {
			setShowInput(false);
			setInputValue('');
			onInputSubmit(inputValue);
		}
	}

	const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const alphaNumRegex = /^[a-zA-Z0-9]*$/;
		if (alphaNumRegex.test(event.target.value)) {
			setInputValue(event.target.value);
		}
	}

	return (
		<>
			{showInput ? (
				<input className={classInput} maxLength={10} type='text' onKeyDown={handleInputKeyPress} value={inputValue} onChange={handleInputChange} placeholder={placeHolder} autoFocus>

				</input>
			) : (
				<button onClick={handleButtonClick} className={classButton}> {textInButton}</button>
			)}
		</>
	);
}