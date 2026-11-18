import {expect,it} from 'vitest'
import {isNetworkFailure} from '../features/walks/networkFailure'
it('distinguishes lost connectivity from permission, sequence and schema failures',()=>{
 for(const error of [new TypeError('Failed to fetch'),{message:'TypeError: Load failed'},new Error('NetworkError when attempting to fetch resource.')])expect(isNetworkFailure(error)).toBe(true)
 for(const error of [{message:'Permission denied'},{message:'Sequence conflict'},{message:'Function does not exist in schema cache'},null])expect(isNetworkFailure(error)).toBe(false)
})
