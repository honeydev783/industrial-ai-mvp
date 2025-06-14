# app/llm_client.py

import boto3
import json
import os

client = boto3.client("bedrock-runtime", region_name=os.getenv("BEDROCK_REGION"))


def ask_claude(query, context_chunks, industry, sme_context, use_external):
    # Build system prompt
    use_external_str = "true" if use_external else "false"

    if not use_external:
        system_prompt = f"""Human:
        You are an expert specialist in industrial process engineering, with deep knowledge
        across industries such as Feed Milling, Food & Beverage, Pharmaceuticals, Water
        Treatment, and General Manufacturing. Your role is to provide accurate, detailed, and
        contextually relevant answers:
        Retrieved Documents:
        {''.join([f"[{chunk['source']}]: {chunk['text']}" for chunk in context_chunks])}
        
        Instructions:
        -  you MUST answer EXCLUSIVELY using the Retrieved Documents above. If the documents do not contain enough information to answer the question, respond with: "Insufficient information in the provided documents to answer the query."
        - Always respond ONLY in the following JSON format:
        {{
            "answer": "insert main answer here",
            "internal_source": "insert source of answer from Retrieved Documents here e.g. 'Source: Pelleting_SOP.pdf – Section: Moisture Conditioning'",
            "external_source": "",
            "document_grounding_percent": "Estimated percent of answer based on retrieved documents (e.g., 93)",
            "used_external_knowledge": "{use_external_str}",
            "following_up": ["suggested follow-up question 1 for the next conversation", "suggested follow-up question 2 for the next conversation"]
        }}
        
        Question: {query} Assistant:"""
    else:
        system_prompt = f"""Human:
        You are an expert specialist in industrial process engineering, with deep knowledge
        across industries such as Feed Milling, Food & Beverage, Pharmaceuticals, Water
        Treatment, and General Manufacturing. Your role is to provide accurate, detailed, and
        contextually relevant answers:
        Retrieved Documents:
        {''.join([f"[{chunk['source']}]: {chunk['text']}" for chunk in context_chunks])}        
        Instructions:
        - First use the Retrieved Documents above to answer the question. If there is no answer in the Retrieved Documents, then use your own knowledge to answer the question.
        - Always respond ONLY in the following JSON format:
        {{
            "answer": "insert main answer here",
            "internal_source": "insert source of answer from Retrieved Documents here e.g. 'Source: Pelleting_SOP.pdf – Section: Moisture Conditioning'",
            "external_source": "insert source of answer from pretrained knowledge here e.g. 'External: FMT Journal 2022'",
            "document_grounding_percent": "0",
            "used_external_knowledge": "{use_external_str}",
            "following_up": ["suggested follow-up question 1 for the next conversation", "suggested follow-up question 2 for the next conversation"]
        }}
        
        Question: {query} Assistant:"""
    prompt_payload = {
        "anthropic_version": "bedrock-2023-05-31",
        "messages": [{"role": "user", "content": system_prompt}],
        "max_tokens": 1024,
        "temperature": 0.7,
    }
    response = client.invoke_model(
        modelId="anthropic.claude-3-5-sonnet-20241022-v2:0",
        contentType="application/json",
        accept="application/json",
        body=json.dumps(prompt_payload),
    )

    body = json.loads(response["body"].read().decode())

    
    text_output = body["content"][0]["text"]
    print("Answer response:", type(text_output))
    data = json.loads(text_output)
    answer = data["answer"]
    internal_source = data["internal_source"]
    external_source = data["external_source"]
    document_grounding_percent = data["document_grounding_percent"]
    used_external_knowledge = data["used_external_knowledge"]
    following_up = data["following_up"]
    # Here you can add regex extraction logic for sources, transparency, follow-ups
    # For simplicity in this example, we just return the full text and dummy values
    # answer = json.load(text_output)
    return (answer, internal_source, external_source, document_grounding_percent, used_external_knowledge, following_up)
