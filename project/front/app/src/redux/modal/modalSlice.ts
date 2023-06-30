import {createSlice, PayloadAction} from '@reduxjs/toolkit';

interface ModalState {
	isOpen: boolean;
	id: string | null;
}

const initialState: ModalState = {
	isOpen: false,
	id: null,
};

const modalSlice = createSlice({
	name: 'modal',
	initialState,
	reducers: {
		openModal: (state, action: PayloadAction<string | null>) => {
			state.isOpen = true;
			state.id = action.payload;
		},
		closeModal: (state) => {
			state.isOpen = false;
		},
	},
});

export const {openModal, closeModal} = modalSlice.actions;

export default modalSlice.reducer;
