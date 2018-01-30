import * as http from 'http';

export interface Context {
	where: any
	data: any
	args: any
	req: any
	hookState: any
	instance: any
	isNewInstance?: boolean
}

export interface OperationHook {
	(ctx: Context, next: () => void): void;
}

export interface BeforeRemoteHook {
	(ctx: Context, unused: any, next: () => void): void;
}

export interface ModelDefinition {
	name: string
}

export interface Model {
	beforeRemote(trigger: '**', beforeRemoteHook: BeforeRemoteHook): void
	observe(trigger: 'after save' | 'after delete' | 'before save', operationHook: OperationHook): void
	definition: ModelDefinition
	getIdName(): string
}

export interface Middleware {
	(req: http.ClientRequest, res: http.ServerResponse): void
}

interface ApplicationModels {
	[key: string]: Model
}

export interface Application {
	models: ApplicationModels
	use(mountPath: string, middleware: Middleware): void
	get(mountPath: string, middleware: Middleware): void
	delete(mountPath: string, middleware: Middleware): void
}
