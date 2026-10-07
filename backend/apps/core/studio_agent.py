import json
import operator
from typing import TypedDict, Annotated, Sequence
from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage
from langchain_ollama import ChatOllama
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode

from apps.core.agent_tools import (
    list_database_tables,
    get_database_schema,
    execute_read_only_sql,
    search_studio_documents,
    analyze_production_image,
    audit_scene_breakdown,
    dispatch_call_sheet,
    dispatch_dpr_finalizer
)

# Define the tools the agent can use
tools = [
    list_database_tables,
    get_database_schema,
    execute_read_only_sql,
    search_studio_documents,
    analyze_production_image,
    audit_scene_breakdown,
    dispatch_call_sheet,
    dispatch_dpr_finalizer
]

# Define the state for the LangGraph
class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], operator.add]
    project_id: str

def get_universal_agent():
    # Initialize the model and bind tools
    # Using local Ollama qwen3.5:9b
    llm = ChatOllama(model="qwen3.5:9b", base_url="http://host.docker.internal:11434", temperature=0.1)
    llm_with_tools = llm.bind_tools(tools)

    # Define nodes
    def call_model(state: AgentState):
        messages = state['messages']
        # Optionally append system prompt with project_id context
        response = llm_with_tools.invoke(messages)
        return {"messages": [response]}

    def should_continue(state: AgentState):
        messages = state['messages']
        last_message = messages[-1]
        # If the LLM makes a tool call, we continue to the tools node
        if getattr(last_message, 'tool_calls', None):
            return "continue"
        # Otherwise, we finish
        return "end"

    # We use the prebuilt ToolNode
    tool_node = ToolNode(tools)

    # Build the graph
    workflow = StateGraph(AgentState)

    workflow.add_node("agent", call_model)
    workflow.add_node("action", tool_node)

    workflow.set_entry_point("agent")

    workflow.add_conditional_edges(
        "agent",
        should_continue,
        {
            "continue": "action",
            "end": END
        }
    )

    workflow.add_edge("action", "agent")

    return workflow.compile()

def chat_with_agent(message: str, project_id: str) -> str:
    """
    Entry point to trigger the agent for chat.
    """
    from apps.narrative.models import Project
    try:
        project = Project.objects.get(id=project_id)
        project_title = project.title
    except Project.DoesNotExist:
        project_title = "Unknown Project"
        
    system_prompt = f"You are CineFlow Copilot, an expert AI Studio Executive. The current project ID is {project_id}. You have direct access to query the PostgreSQL database. To answer questions, FIRST use 'list_database_tables'. NEXT, use 'get_database_schema' to find the correct column names for the tables you need. FINALLY, write and execute a postgres query using 'execute_read_only_sql'. ALWAYS filter your SQL queries using project_id = '{project_id}'. Do not ask the user for permission, just run the queries and deliver the final answer concisely. You also have a vision tool. If the user asks about an image, photo, or storyboard, or provides an image URL, use 'analyze_production_image' to look at it and answer their question. If the user asks to verify, audit, or check the completeness of a scene's breakdown, use 'audit_scene_breakdown'. You now have execution authority. If the user asks to generate, email, or finalize a Call Sheet or DPR (Daily Production Report), FIRST find the correct shoot_day_id using your SQL tools, THEN use 'dispatch_call_sheet' or 'dispatch_dpr_finalizer' to execute the request. Do not tell the user you cannot perform actions; always use your dispatch tools."
    
    initial_state = {
        "messages": [
            SystemMessage(content=system_prompt),
            HumanMessage(content=message)
        ],
        "project_id": project_id
    }
    
    agent = get_universal_agent()
    final_state = agent.invoke(initial_state)
    return final_state["messages"][-1].content
