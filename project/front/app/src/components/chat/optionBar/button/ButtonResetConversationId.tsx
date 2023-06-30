import React, {Dispatch, SetStateAction} from 'react'
import {ReactComponent as Home} from '../../../../images/chat/home.svg'

const ButtonResetConversationId = ({setId}: { setId: Dispatch<SetStateAction<string>> }) => {

	const handleOnClick = () => {
		setId('');
	};

	return (
		<div className='chat-option-bar-home-button' onClick={() => handleOnClick()}>
			<Home className='chat-option-bar-home-button-image'/>
		</div>
	)
};

export default ButtonResetConversationId;
