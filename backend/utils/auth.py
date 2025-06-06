import boto3
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import os

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

cognito_client = boto3.client("cognito-idp", region_name=os.getenv("AWS_REGION"))

async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        response = cognito_client.get_user(AccessToken=token)
        return {"sub": next(attr['Value'] for attr in response['UserAttributes'] if attr['Name'] == 'sub')}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Cognito token")