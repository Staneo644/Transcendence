import {createSlice} from '@reduxjs/toolkit';

interface ModalState {
	isOpenSideBar: boolean;
	isOpenCreateChannel: boolean;
	isOpenInviteChannel: boolean;
	isOpenUpdateChannel: boolean;
	isOpenListUser: boolean;
}

const initialState: ModalState = {
	isOpenSideBar: false,
	isOpenCreateChannel: false,
	isOpenUpdateChannel: false,
	isOpenInviteChannel: false,
	isOpenListUser: false,
};

const modalChatSlice = createSlice({
	name: 'modal',
	initialState,
	reducers: {
		switchChatModalSideBar: (state) => {
			state.isOpenSideBar = !state.isOpenSideBar;
		},
		switchChatModalCreateChannel: (state) => {
			state.isOpenCreateChannel = !state.isOpenCreateChannel;
		},
		switchChatModalInviteChannel: (state) => {
			state.isOpenInviteChannel = !state.isOpenInviteChannel;
		},
		switchChatModalUpdateChannel: (state) => {
			state.isOpenUpdateChannel = !state.isOpenUpdateChannel;
		},
		switchChatModalListUser: (state) => {
			state.isOpenListUser = !state.isOpenListUser;
		},
		closeChatModalListUser: (state) => {
			state.isOpenListUser = false;
		},
	},
});

export const
	{
		switchChatModalSideBar,
		switchChatModalCreateChannel,
		switchChatModalInviteChannel,
		switchChatModalUpdateChannel,
		switchChatModalListUser,
		closeChatModalListUser,
	} = modalChatSlice.actions;

export default modalChatSlice.reducer;
