import React from "react";
import SocketSingleton from "../../../../socket";

const socketInstance = SocketSingleton.getInstance();
const socket = socketInstance.getSocket();
const ButtonLeaveChannel = ({channelId}: { channelId: string }) => {

	function leaveChannel() {
		socket.emit('leave_channel', {token: localStorage.getItem('jwtAuthorization'), channel_id: channelId});
	}

	return (
		<div className='' onClick={() => leaveChannel()}>
			➔
		</div>
	);
}

export default ButtonLeaveChannel;