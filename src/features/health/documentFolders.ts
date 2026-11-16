const uuid='[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
const folderPrefix=new RegExp(`^folder_(${uuid})--(.+)$`,'i')
export function documentLabel(objectName:string){
 const label=objectName.slice(38)
 const match=folderPrefix.exec(label)
 return {name:match?match[2]:label,folderId:match?match[1].toLowerCase():null}
}
export function documentObjectName(id:string,folderId:string|null,name:string){
 const safe=name.replace(/[^a-zA-Z0-9._ -]/g,'_').slice(-150)
 return `${id}--${folderId?`folder_${folderId}--`:''}${safe}`
}
