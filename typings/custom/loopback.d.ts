import * as http from 'http';

export interface Context {
	where: any
	data: any
	instance: any
	isNewInstance?: boolean
}

export interface OperationHook {
	(ctx: Context, next: () => void): void;
}

export interface ModelDefinition {
	name: string
}

export interface Model {
	observe(trigger: 'after save' | 'after delete', operationHook: OperationHook): void
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
