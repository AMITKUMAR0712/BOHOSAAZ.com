pipeline {
    agent any

    stages {
        stage('Checkout') {
            steps {
                echo 'Repository checkout successful'
            }
        }

        stage('Node Check') {
            steps {
                sh 'node --version'
                sh 'npm --version'
            }
        }

        stage('Docker Check') {
            steps {
                sh 'docker --version'
                sh 'docker ps'
            }
        }
    }
}
