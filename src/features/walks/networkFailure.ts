/** Do not present permission/schema failures as loss of internet. */
export function isNetworkFailure(error:unknown){
 const message=error instanceof Error?error.message:error&&typeof error==='object'&&'message' in error?String(error.message):String(error)
 return /failed to fetch|fetch failed|networkerror|network request failed|load failed|network connection.*lost|internet.*offline/i.test(message)
}
