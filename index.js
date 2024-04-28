
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
require('dotenv').config();

const S3Client=new S3Client({  
        region: process.env.S3_UPLOAD_REGION,
        credentials: {
          accessKeyId: process.env.S3_UPLOAD_KEY,
          secretAccessKey: process.env.S3_UPLOAD_SECRET
},

});


async function getObjectURL(key){
        const command =new GetObjectCommand({
                Bucket: process.env.S3_UPLOAD_BUCKET,

Key:key,

        });

        const url= await getSignedUrl(S3Client,command);
        return url;
}