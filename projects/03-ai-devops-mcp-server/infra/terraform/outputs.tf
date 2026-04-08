output "instance_public_ip" {
  description = "Public IP of the EC2 instance"
  value       = aws_instance.mcp_demo.public_ip
}

output "ssh_command" {
  description = "SSH into the instance"
  value       = "ssh -i ~/.ssh/id_rsa ubuntu@${aws_instance.mcp_demo.public_ip}"
}

output "kubeconfig_command" {
  description = "Download kubeconfig to your laptop after bootstrap completes (~2 min)"
  value       = "scp -i ~/.ssh/id_rsa ubuntu@${aws_instance.mcp_demo.public_ip}:/etc/rancher/k3s/k3s.yaml ~/.kube/mcp-demo-config"
}
