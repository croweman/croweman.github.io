export const waitForAssertions = (asyncAssertionFunc, timeoutMilliseconds = 2000, failureMessage = undefined) => new Promise((resolve, reject) => {
    let timeoutId

    const intervalId = setInterval(async () => {
        try {
            await asyncAssertionFunc()
            clearTimeout(timeoutId)
            clearInterval(intervalId)
            return resolve({})
        } catch (err) {
            // do nothing
        }
    }, 10)

    timeoutId = setTimeout(() => {
        clearInterval(intervalId)
        let message = failureMessage ?? `Assertion conditions were not met within ${timeoutMilliseconds} milliseconds`
        reject(new Error(message))
    }, timeoutMilliseconds)
})
