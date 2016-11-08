declare namespace loopback {

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
		observe(trigger: 'after save' | 'after delete', hook: OperationHook): void
		definition: ModelDefinition
		getIdName(): string
	}

	export interface Listener {
		(): void
	}

	export interface Connection {
		addListener(event: string, listener: Listener): void
	}

	export interface Request {
		connection: Connection
	}

	export interface ResponseHeaders {
		'Content-Type'?: string
		'Cache-Control'?: string
		'Connection'?: string
		'Access-Control-Allow-Origin'?: string
	}

	export interface Response {
		status: number
		finished: boolean
		set(headers: ResponseHeaders): void
		setTimeout(t: number): void
		end(): void
		write(data: string): void
	}

	export interface Middleware {
		(req: Request, res: Response): void
	}

	interface ApplicationModels {
		[key: string]: Model
	}

	export interface Application {
		models: ApplicationModels
		use(mountPath: string, middleware: Middleware): void
	}
}
