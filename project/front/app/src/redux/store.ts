import {configureStore} from '@reduxjs/toolkit';
import modalReducer from './modal/modalSlice';
import modalChatReducer from './chat/modalChatSlice';
import finalGameStat from './game/gameSlice';
import searchReducer from './search/searchSlice';
import beginToOption from "./game/beginToOption";
import idReducer from './id/idSlice';
import conversationId from './conversationId/conversationId';

const store = configureStore({
	reducer: {
		modal: modalReducer,
		modalChat: modalChatReducer,
		finalGame: finalGameStat,
		searchUser: searchReducer,
		beginToOption: beginToOption,
		id: idReducer,
		conversationId: conversationId,
	},
});

export type RootState = ReturnType<typeof store.getState>;

export default store;
