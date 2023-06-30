import './css/sidebar.css'
import React from 'react'
import {Channel} from '../../pages/chat';
import ChannelSideBar from './Channel';

function SideBarChat(
	{listChannel, setConversationId}:
		{
			listChannel: Array<Channel>,
			setConversationId: React.Dispatch<React.SetStateAction<string>>
		}) {

	const handleSwitchChannel = (id: string) => {
		setConversationId(id);
	}

	return (
		<div className='chatSideBar'>
			{listChannel.length !== 0 ? listChannel.map((channel) => (
				<div onClick={() => handleSwitchChannel(channel.id)} key={channel.id}>
					<ChannelSideBar channel={channel}/>
				</div>
			)) : <p className='chat-side-bar-no-conversation-found'>No conversation found!</p>}
		</div>
	);
}

export default SideBarChat;
