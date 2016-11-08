import * as http from 'http';

export interface Context {
	where: any
	data: any
	instance: any
	isNewInstance?: boolean
}

export interface Next {
	(): void
}

export interface OperationHook {
	(ctx: Context, next: Next): void;
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
}
