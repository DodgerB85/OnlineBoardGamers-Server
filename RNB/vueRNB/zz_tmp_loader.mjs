export async function resolve(specifier, context, nextResolve) {
	try {
		return await nextResolve(specifier, context)
	} catch (e) {
		if (e && e.code === "ERR_MODULE_NOT_FOUND" && !specifier.endsWith(".js") && (specifier.startsWith("./") || specifier.startsWith("../"))) {
			try {
				return await nextResolve(specifier + ".js", context)
			} catch {
				// fall through
			}
		}
		throw e
	}
}
