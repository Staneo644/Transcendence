export interface IUser {
	id: string;
	email: string;
	username: string;
	enabled2FA: boolean;
	experience: number;
	victories: number;
	defeats: number;
	status: number;
}